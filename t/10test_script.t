use t::boilerplate;

use Test::More;

use_ok 'Web::Components';
require_ok 'Web::Components::Role';

{  package Component::Server;

   use Class::Usul;
   use Moo;

   has 'app'  => is => 'lazy', builder => sub {
      Class::Usul->new( config => { appclass => __PACKAGE__  } ) },
      handles => [ 'config', 'debug', 'l10n', 'log' ];

   with q(Web::Components::Loader);
}

my $server = Component::Server->new;

is $server->dispatch_request, 0, 'Default dispatch';

done_testing;

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
