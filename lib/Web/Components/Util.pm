package Web::Components::Util;

use strictures;
use parent 'Exporter::Tiny';

use Module::Pluggable::Object;
use Web::ComposableRequest::Constants qw( EXCEPTION_CLASS TRUE );
use Unexpected::Functions             qw( Unspecified );

our @EXPORT_OK  = qw( exception first_char is_arrayref load_components throw );

sub exception (;@) {
   return EXCEPTION_CLASS->caught( @_ );
}

sub first_char ($) {
   return substr $_[ 0 ], 0, 1;
}

sub is_arrayref (;$) {
   return $_[ 0 ] && ref $_[ 0 ] eq 'ARRAY' ? 1 : 0;
}

sub load_components ($$;$) {
   my ($app, $search_path, $opts) = @_;

   $opts //= {}; $opts->{application} //= $app;

   $search_path or throw( Unspecified, [ 'search path' ] );

   my $config = $app->config; my $appclass = $config->appclass;

   if (first_char $search_path eq '+') { $search_path = substr $search_path, 1 }
   else { $search_path = "${appclass}::${search_path}" }

   my $depth    = () = split m{ :: }mx, $search_path, -1; $depth += 1;
   my $finder   = Module::Pluggable::Object->new
      ( max_depth   => $depth,           min_depth => $depth,
        search_path => [ $search_path ], require   => TRUE, );
   my $compos   = $opts->{components} = {}; # Dependency injection

   for my $class ($finder->plugins) {
     (my $klass = $class) =~ s{ \A $appclass :: }{}mx;
      my $attr  = { %{ $config->components->{ $klass } // {} }, %{ $opts } };
      my $comp  = $class->new( $attr ); $compos->{ $comp->moniker } = $comp;
   }

   return $compos;
}

sub throw (;@) {
   EXCEPTION_CLASS->throw( @_ );
}

1;

__END__

=pod

=encoding utf-8

=head1 Name

Web::Components::Util - One-line description of the modules purpose

=head1 Synopsis

   use Web::Components::Util;
   # Brief but working code examples

=head1 Description

=head1 Configuration and Environment

Defines the following attributes;

=over 3

=back

=head1 Subroutines/Methods

=head1 Diagnostics

=head1 Dependencies

=over 3

=item L<Class::Usul>

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
