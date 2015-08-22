package Web::Components::Role::Loading;

use namespace::autoclean;

use HTTP::Status          qw( HTTP_BAD_REQUEST HTTP_FOUND
                              HTTP_INTERNAL_SERVER_ERROR );
use Try::Tiny;
use Unexpected::Types     qw( ArrayRef HashRef Object );
use Web::Components::Util qw( deref exception is_arrayref
                              load_components throw );
use Web::ComposableRequest;
use Web::Simple::Role;

requires qw( config log );

# Attribute constructors
my $_build_factory_args = sub {
   my $self = shift; my $localiser;

   $self->can( 'l10n' ) and $localiser = sub { $self->l10n->localize( @_ ) };

   my $prefix = deref $self->config, 'name';

   return sub {
      my ($self, $attr) = @_;

      $localiser and $attr->{localiser    } = $localiser;
      $prefix    and $attr->{domain_prefix} = $prefix;
      return $attr;
   };
};

# Public attributes
has 'controllers'     => is => 'lazy', isa => ArrayRef[Object], builder => sub {
   my $controllers    =  load_components 'Controller', application => $_[ 0 ];
   return [ map { $controllers->{ $_ } } sort keys %{ $controllers } ] };

has 'models'          => is => 'lazy', isa => HashRef[Object], builder => sub {
   load_components 'Model', application => $_[ 0 ], views => $_[ 0 ]->views };

has 'request_factory' => is => 'lazy', isa => Object, builder => sub {
   Web::ComposableRequest->new
      ( buildargs     => $_build_factory_args->( $_[ 0 ] ),
        config        => $_[ 0 ]->config, ) };

has 'views'           => is => 'lazy', isa => HashRef[Object],
   builder            => sub { load_components 'View', application => $_[ 0 ] };

# Private functions
my $_header = sub {
   return [ 'Content-Type' => 'text/plain', @{ $_[ 0 ] // [] } ];
};

# Private methods
my $_internal_server_error = sub {
   my ($self, $e) = @_; $self->log->error( $e );

   return [ HTTP_INTERNAL_SERVER_ERROR, $_header->(), [ $e ] ];
};

my $_redirect = sub {
   my ($self, $req, $stash) = @_; my $code = $stash->{code} // HTTP_FOUND;

   my $redirect = $stash->{redirect}; my $message = $redirect->{message};

   if ($message and $req->can( 'session' )) {
      # TODO: This here unconditionally, really?
      $self->log->info( $req->loc_default( @{ $message } ) );

      my $mid; $mid = $req->session->add_status_message( $message )
         and $redirect->{location}->query_form( 'mid', $mid );
   }

   return [ $code, [ 'Location', $redirect->{location} ], [] ];
};

my $_render_view = sub {
   my ($self, $moniker, $method, $req, $stash) = @_;

   is_arrayref $stash and return $stash;

   exists $stash->{redirect} and return $self->$_redirect( $req, $stash );

   $stash->{view}
      or throw 'Model [_1] method [_2] stashed no view', [ $moniker, $method ];

   my $view = $self->views->{ $stash->{view} }
      or throw 'Model [_1] method [_2] unknown view [_3]',
               [ $moniker, $method, $stash->{view} ];
   my $res  = $view->serialize( $req, $stash )
      or throw 'View [_1] returned false', [ $stash->{view} ];

   return $res
};

my $_render_exception = sub {
   my ($self, $moniker, $req, $e) = @_; my $res;

   ($e->can( 'rv' ) and $e->rv > HTTP_BAD_REQUEST)
      or $e = exception $e, { rv => HTTP_BAD_REQUEST };

   my $username = $req->can( 'username' ) ? $req->username : 'unknown';

   my $msg = "${e}"; chomp $msg; $self->log->error( "${msg} (${username})" );

   try   {
      my $stash = $self->models->{ $moniker }->exception_handler( $req, $e );

      $res = $self->$_render_view( $moniker, 'exception_handler', $req, $stash);
   }
   catch { $res = $self->$_internal_server_error( $_ ) };

   return $res;
};

my $_render = sub {
   my ($self, $args) = @_; my $models = $self->models;

   (is_arrayref $args and $args->[ 0 ] and exists $models->{ $args->[ 0 ] })
      or return $args;

   my ($moniker, $method, undef, @request) = @{ $args };

   my $opts = { domain => $moniker }; my ($req, $res);

   try   {
      $req = $self->request_factory->new_from_simple_request( $opts, @request );
   }
   catch { $res = $self->$_internal_server_error( $_ ) };

   $res and return $res;

   try   {
      $method eq 'from_request' and $method = $req->tunnel_method.'_action';

      my $stash = $models->{ $moniker }->execute( $method, $req );

      $res = $self->$_render_view( $moniker, $method, $req, $stash );
   }
   catch { $res = $self->$_render_exception( $moniker, $req, $_ ) };

   $req->can( 'session' ) and $req->session->update;

   return $res;
};

my $_filter = sub () {
   my $self = shift; return response_filter { $self->$_render( @_ ) };
};

# Construction
sub dispatch_request {
   # Not applied if it already exists in the consuming class
}

around 'dispatch_request' => sub {
   return $_filter, map { $_->dispatch_request } @{ $_[ 1 ]->controllers };
};

1;

__END__

=pod

=encoding utf-8

=head1 Name

Web::Components::Role::Loading - Loads and instantiates MVC components

=head1 Synopsis

   package Component::Server;

   use Class::Usul;
   use Moo;

   has 'app'  => is => 'lazy', builder => sub {
      Class::Usul->new( config => { appclass => __PACKAGE__  } ) },
      handles => [ 'config', 'log' ];

   with q(Web::Components::Role::Loading);

=head1 Description

Loads and instantiates MVC components

=head1 Configuration and Environment

Defines the following attributes;

=over 3

=item C<controllers>

An array reference of controller object reference sorted into C<moniker>
order

=item C<models>

A hash reference of model object references

=item C<request_factory>

An instance of L<Web::ComposableRequest>

=item C<view>

A hash reference of view object references

=back

=head1 Subroutines/Methods

=head2 C<dispatch_request>

Installs a response filter that processes and renders the responses from
the controller methods

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<HTTP::Message>

=item L<Try::Tiny>

=item L<Unexpected>

=item L<Web::Simple>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <pjfl@cpan.org> >>

=head1 License and Copyright

Copyright (c) 2015 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
